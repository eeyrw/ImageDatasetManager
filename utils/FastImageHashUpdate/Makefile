# Makefile for update_hashes

# 编译器
CXX = g++
CXXFLAGS = -std=c++17 -O2 -Wall -pthread

# 链接库
LIBS = -lpq -lssl -lcrypto

# 如果是 macOS 并用 Homebrew 安装 OpenSSL，可以取消注释下面两行
# OPENSSL_INC = -I/usr/local/opt/openssl/include
# OPENSSL_LIB = -L/usr/local/opt/openssl/lib

# 可执行文件
TARGET = update_hashes

# 源码文件
SRC = update_hashes.cpp

all: $(TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) $(OPENSSL_INC) $(SRC) -o $(TARGET) $(OPENSSL_LIB) $(LIBS)

clean:
	rm -f $(TARGET)
