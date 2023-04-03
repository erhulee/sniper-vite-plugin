import { OutputOptions } from 'rollup';
import FormData from 'form-data'
import glob from 'fast-glob';
import { resolve } from 'path';
import { readFileSync } from 'fs'
import axios from 'axios';

export default function SniperPlugin(option: {
  appid: string,
  endpoint?: string
  cdn?: string,
  loggerConfig?: {
    endpoint?: string,
    method?: "post" | "get",
    type?: "xhr" | "beacon"
  }
}) {
  return {
    name: "sniper",
    transformIndexHtml(html: string) {
      const { loggerConfig = {} } = option;
      const { endpoint = "https://bdul0j.laf.dev/logger", method = "post", type = "xhr" } = loggerConfig
      const content = `
            <script src=${option.cdn ?? "https://bdul0j-web-site.oss.laf.dev/index.js"}> </script>
            <script>
                const webMonitor = new window.WebMonitor(
                  "${option.appid}",
                  "${endpoint}",
                  "${method}",
                  "${type}"
                );
                WebMonitor.start();
            </script>
      `

      return html.replace("<head>", "<head>" + content)
    },

    async writeBundle(outputConfig: OutputOptions) {
      const outputDir = outputConfig.dir || '';
      const files = await glob('./**/*.map', { cwd: outputDir });
      const sourceMaps = files.map(fileName => {
        const sourcePath = fileName;
        const sourceFilename = resolve(outputDir, sourcePath)
        const content = readFileSync(sourceFilename, 'utf8')
        return {
          content: content,
          sourcemap_url: sourceFilename,
          file_name: fileName.split("/").pop()
        }
      })

      await Promise.all(sourceMaps.map(async (file) => {
        const form = new FormData();
        form.append("files", file.content, file.file_name);
        form.append("appid", option.appid);
        await axios.post(option.endpoint ?? "https://bdul0j.laf.dev/sourceMapUpload", form, {
          headers: {
            "Content-Type": 'multipart/form-data'
          }
        })
      }))
    }
  }
}