#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <thread>
#include <mutex>
#include <queue>
#include <openssl/sha.h>
#include <postgresql/libpq-fe.h>
#include <getopt.h>  // 用于解析命令行参数

struct ImageRecord {
    std::string id;
    std::string file_path;
    std::string dataset_dir;
    std::string file_hash;
};

// ----------------------
// SHA256 计算
// ----------------------
std::string compute_sha256(const std::string &file_path) {
    std::ifstream file(file_path, std::ios::binary);
    if (!file) return "";

    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    char buffer[128*1024];
    while (file.read(buffer, sizeof(buffer))) {
        SHA256_Update(&sha256, buffer, file.gcount());
    }
    if (file.gcount() > 0)
        SHA256_Update(&sha256, buffer, file.gcount());

    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_Final(hash, &sha256);

    char output[65];
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++)
        sprintf(output + i * 2, "%02x", hash[i]);
    output[64] = 0;
    return std::string(output);
}

// ----------------------
// 数据库连接
// ----------------------
PGconn* connect_db(const std::string& host, const std::string& dbname,
                   const std::string& user, const std::string& password) {
    std::string conninfo = "host=" + host + " dbname=" + dbname + " user=" + user + " password=" + password;
    PGconn *conn = PQconnectdb(conninfo.c_str());
    if (PQstatus(conn) != CONNECTION_OK) {
        std::cerr << "Connection failed: " << PQerrorMessage(conn) << "\n";
        PQfinish(conn);
        return nullptr;
    }
    return conn;
}

// ----------------------
// 查询需要更新的图片
// ----------------------
std::vector<ImageRecord> fetch_images(PGconn* conn) {
    std::vector<ImageRecord> result;
    PGresult *res = PQexec(conn,
        "SELECT i.id, i.file_path, d.dir_path "
        "FROM images i "
        "JOIN datasets d ON i.dataset_id = d.id "
        "WHERE i.file_hash IS NULL");

    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        std::cerr << "Query failed: " << PQerrorMessage(conn) << "\n";
        PQclear(res);
        return result;
    }

    int n = PQntuples(res);
    for (int i = 0; i < n; ++i) {
        result.push_back({
            PQgetvalue(res, i, 0),
            PQgetvalue(res, i, 1),
            PQgetvalue(res, i, 2),
            ""
        });
    }
    PQclear(res);
    return result;
}

// ----------------------
// 多线程工作函数
// ----------------------
void worker(std::queue<ImageRecord>& q, std::mutex& q_mtx,
            const std::string& root_dir,
            std::vector<ImageRecord>& results, std::mutex& res_mtx) {
    while (true) {
        q_mtx.lock();
        if (q.empty()) { q_mtx.unlock(); break; }
        auto img = q.front(); q.pop();
        q_mtx.unlock();

        std::string full_path = root_dir + "/" + img.dataset_dir + "/" + img.file_path;
        std::string hash = compute_sha256(full_path);
        if (hash.empty()) {
            std::cerr << "[WARN] Failed to read file: " << full_path << "\n";
            continue;
        }
        img.file_hash = hash;

        res_mtx.lock();
        results.push_back(img);
        res_mtx.unlock();
    }
}

// ----------------------
// 写 CSV 文件
// ----------------------
void write_csv(const std::string& csv_path, const std::vector<ImageRecord>& data) {
    std::ofstream fout(csv_path);
    for (auto& img : data) {
        fout << img.id << "," << img.file_hash << "\n";
    }
    fout.close();
}

// ----------------------
// 导入 CSV 并更新 PostgreSQL (使用 COPY FROM STDIN)
// ----------------------
void import_csv_update(PGconn* conn, const std::string& csv_path) {
    // 1. 创建临时表
    PGresult *res = PQexec(conn, "CREATE TEMP TABLE tmp_hashes (id UUID PRIMARY KEY, file_hash CHAR(64));");
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        std::cerr << "Create temp table failed: " << PQerrorMessage(conn) << "\n";
        PQclear(res);
        return;
    }
    PQclear(res);

    // 2. 启动 COPY ... FROM STDIN
    res = PQexec(conn, "COPY tmp_hashes(id, file_hash) FROM STDIN WITH (FORMAT csv);");
    if (PQresultStatus(res) != PGRES_COPY_IN) {
        std::cerr << "COPY FROM STDIN failed to start: " << PQerrorMessage(conn) << "\n";
        PQclear(res);
        return;
    }
    PQclear(res);

    // 3. 逐行读取 CSV 文件并写入数据库
    std::ifstream fin(csv_path);
    if (!fin) {
        std::cerr << "Failed to open CSV file: " << csv_path << "\n";
        PQputCopyEnd(conn, "error");
        return;
    }

    std::string line;
    while (std::getline(fin, line)) {
        line.push_back('\n'); // COPY 协议需要行尾换行
        if (PQputCopyData(conn, line.c_str(), static_cast<int>(line.size())) <= 0) {
            std::cerr << "PQputCopyData failed: " << PQerrorMessage(conn) << "\n";
            PQputCopyEnd(conn, "error");
            return;
        }
    }
    fin.close();

    // 4. 通知结束
    if (PQputCopyEnd(conn, nullptr) <= 0) {
        std::cerr << "PQputCopyEnd failed: " << PQerrorMessage(conn) << "\n";
        return;
    }

    // 5. 获取 COPY 的结果
    while ((res = PQgetResult(conn)) != nullptr) {
        if (PQresultStatus(res) != PGRES_COMMAND_OK) {
            std::cerr << "COPY IN result error: " << PQerrorMessage(conn) << "\n";
        }
        PQclear(res);
    }

    // 6. 更新 images 表
    res = PQexec(conn,
        "UPDATE images i "
        "SET file_hash = t.file_hash "
        "FROM tmp_hashes t "
        "WHERE i.id = t.id;");
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        std::cerr << "Update images failed: " << PQerrorMessage(conn) << "\n";
    }
    PQclear(res);
}

// ----------------------
// 主函数
// ----------------------
int main(int argc, char* argv[]) {
    // 默认参数
    std::string root_dir, host="localhost", dbname="your_db", user="your_user", password="your_password";
    std::string csv_path="/tmp/image_hashes.csv";
    int num_threads = 8;
    bool force_recalc = false;

    // 命令行解析
    int opt;
    const struct option longopts[] = {
        {"force", no_argument, nullptr, 'f'},
        {nullptr, 0, nullptr, 0}
    };

    while ((opt = getopt_long(argc, argv, "r:h:d:u:p:c:t:f", longopts, nullptr)) != -1) {
        switch(opt){
            case 'r': root_dir = optarg; break;
            case 'h': host = optarg; break;
            case 'd': dbname = optarg; break;
            case 'u': user = optarg; break;
            case 'p': password = optarg; break;
            case 'c': csv_path = optarg; break;
            case 't': num_threads = std::stoi(optarg); break;
            case 'f': force_recalc = true; break;
            default:
                std::cerr << "Usage: " << argv[0]
                          << " -r root_dir [-h host] [-d dbname] [-u user] [-p password] "
                          << "[-c csv_path] [-t threads] [--force]\n";
                return 1;
        }
    }

    if (root_dir.empty()) {
        std::cerr << "Root directory is required (-r).\n";
        return 1;
    }

    PGconn* conn = connect_db(host, dbname, user, password);
    if (!conn) return 1;

    // 检查 CSV 是否存在
    std::ifstream test_csv(csv_path);
    if (test_csv.good() && !force_recalc) {
        std::cout << "CSV file already exists, skip computing hashes. Use --force to recalc.\n";
        import_csv_update(conn, csv_path);
        PQfinish(conn);
        return 0;
    }

    // CSV 不存在 或 强制重新计算
    auto images = fetch_images(conn);
    std::cout << "Found " << images.size() << " images without hash.\n";

    std::queue<ImageRecord> q;
    for (auto &img : images) q.push(img);
    std::mutex q_mtx;

    std::vector<ImageRecord> results;
    std::mutex res_mtx;

    std::vector<std::thread> threads;
    for (int i = 0; i < num_threads; ++i)
        threads.emplace_back(worker, std::ref(q), std::ref(q_mtx),
                             std::ref(root_dir), std::ref(results), std::ref(res_mtx));

    for (auto& t : threads) t.join();

    write_csv(csv_path, results);
    std::cout << "CSV file generated: " << csv_path << "\n";

    import_csv_update(conn, csv_path);

    PQfinish(conn);
    std::cout << "All done!\n";
    return 0;
}