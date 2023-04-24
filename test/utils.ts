import * as fs from "fs/promises";

export async function readDiffFile(filePath: string): Promise<string> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return fileContent;
  } catch (error) {
    console.error(`Error reading file: ${error}`);
    return "";
  }
}
