// lib/scorm/manifestParser.ts
import { XMLParser } from "fast-xml-parser";
import type { File as ZipEntry } from "unzipper";

export async function parseManifest(files: ZipEntry[]) {
  const manifestEntry = files.find(
    (entry) =>
      entry.path.replace(/\\/g, "/").toLowerCase() === "imsmanifest.xml"
  );

  if (!manifestEntry) {
    throw new Error("imsmanifest.xml not found in package");
  }

  const manifestBuffer = await manifestEntry.buffer();
  const manifestXml = manifestBuffer.toString("utf-8");

  const parser = new XMLParser({ ignoreAttributes: false });
  const manifest = parser.parse(manifestXml);

  const resources = manifest?.manifest?.resources?.resource;
  if (!resources) {
    throw new Error("No SCORM resources found in manifest");
  }

  const resource = Array.isArray(resources)
    ? resources.find((item) => item["@_href"])
    : resources;

  const entryPoint = resource?.["@_href"];
  if (!entryPoint) {
    throw new Error("Launch file not found in manifest");
  }

  const scormVersion =
    manifest?.manifest?.metadata?.schemaversion?.toString() ?? "1.2";

  return { entryPoint, scormVersion };
}