import pathlib
import os

class MultiDatasets:
    def __init__(self, topDir,debugWithoutSave=False) -> None:
        self.topDir = topDir
        self.debugWithoutSave = debugWithoutSave
        self.dirsHasImageInfoJson = []
        self.dirsHasNotImageInfoJson = []

    def scanDir(self, printScanResult=False):
        self.dirsHasImageInfoJson, self.dirsHasNotImageInfoJson = self.detectImageInfoFolder(
            self.topDir)

        if printScanResult:
            print(
                'Scan Result (--: Has ImageInfoJson file, ??: Has not ImageInfoJson file)')
            for dir in self.dirsHasImageInfoJson:
                print('--', dir)
            for dir in self.dirsHasNotImageInfoJson:
                print('??', dir)

    def detectImageInfoFolder(self, path, ImageInfoJsonFileName='ImageInfo.json'):
        dirsHasImageInfoJson = []
        dirsHasNotImageInfoJson = []
        dir_HasImageInfo = {}

        for entry in os.scandir(path):
            file_path = entry.path
            if entry.is_file(follow_symlinks=True) and os.path.basename(file_path) == ImageInfoJsonFileName:
                dirsHasImageInfoJson.append(file_path)
                return dirsHasImageInfoJson, dirsHasNotImageInfoJson
            elif entry.is_dir(follow_symlinks=True):
                dirsHasImageInfoJson_, dirsHasNotImageInfoJson_ = self.detectImageInfoFolder(
                    file_path)
                dirsHasImageInfoJson.extend(dirsHasImageInfoJson_)
                dirsHasNotImageInfoJson.extend(dirsHasNotImageInfoJson_)
                if len(dirsHasImageInfoJson_) > 0:
                    dir_HasImageInfo[file_path] = True
                else:
                    dir_HasImageInfo[file_path] = False

        if len(dirsHasImageInfoJson) > 0:
            for path, hasImageInfo in dir_HasImageInfo.items():
                if not hasImageInfo:
                    dirsHasNotImageInfoJson.append(path)

        return dirsHasImageInfoJson, dirsHasNotImageInfoJson


    def isInFilterDir(self,dir,filteredDirList):

        filteredDirList = [pathlib.Path(dirPath)
                           for dirPath in filteredDirList]
        dirRelativepath = pathlib.Path(
            os.path.relpath(dir, self.topDir))

        detectedFilterDir = False
        for filterd in filteredDirList:
            if filterd in dirRelativepath.parents:
                detectedFilterDir = True
                break
        return detectedFilterDir
            
