from pathlib import Path

class DatasetDectector:
    def __init__(self, topDir) -> None:
        self.topDir = topDir
        self.imageInfoFilesInDir = []
        self.dirsHasNotImageInfo = []

    def scanDir(self, printScanResult=False):
        self.imageInfoFilesInDir, self.dirsHasNotImageInfo = self.detectImageInfoFolder(
            self.topDir)

        if printScanResult:
            print(
                'Scan Result (--: Has ImageInfofile, ??: Has not ImageInfofile)')
            for dir in self.imageInfoFilesInDir:
                print('--', dir)
            for dir in self.dirsHasNotImageInfo:
                print('??', dir)

    def detectImageInfoFolder(self, path, ImageInfoFileNameList=['ImageInfo.json', 'ImageInfo.parquet']):
        imageInfoFilesInDir = []
        dirsHasNotImageInfo = []
        dir_HasImageInfo = {}

        current_path = Path(path)
        for imageInfoFile in ImageInfoFileNameList:
            imageInfoPath = current_path/Path(imageInfoFile)
            if imageInfoPath.is_file():
                imageInfoFilesInDir.append(imageInfoPath)

        if len(imageInfoFilesInDir) > 0:
            return (imageInfoFilesInDir,), dirsHasNotImageInfo
        else:
            for entry in current_path.iterdir():
                if entry.is_dir():
                    imageInfoFilesInDir_, dirsHasNotImageInfo_ = self.detectImageInfoFolder(
                        entry)
                    imageInfoFilesInDir.extend(imageInfoFilesInDir_)
                    dirsHasNotImageInfo.extend(dirsHasNotImageInfo_)
                    if len(imageInfoFilesInDir_) > 0:
                        dir_HasImageInfo[entry] = True
                    else:
                        dir_HasImageInfo[entry] = False

            if len(imageInfoFilesInDir) > 0:
                for path, hasImageInfo in dir_HasImageInfo.items():
                    if not hasImageInfo:
                        dirsHasNotImageInfo.append(path)

            return imageInfoFilesInDir, dirsHasNotImageInfo




