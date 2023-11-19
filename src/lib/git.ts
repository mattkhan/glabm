import { exec } from "child_process";

export function getCurrentBranchName() {
  return new Promise<string>((resolve, reject) => {
    exec("git branch --show-current", (err, stdout, stderr) => {
      if (err || stderr) reject("An error occurred.");

      resolve(stdout.trim());
    });
  });
}

export function pathFromRemoteURL(url: string) {
  const path = url.split(":")[1];
  return path.substring(0, path.lastIndexOf("."));
}

export function getRemoteOriginURL() {
  return new Promise<string>((resolve, reject) => {
    exec("git config --get remote.origin.url", (err, stdout, stderr) => {
      if (err || stderr) reject("An error occurred.");

      resolve(stdout.trim());
    });
  });
}
