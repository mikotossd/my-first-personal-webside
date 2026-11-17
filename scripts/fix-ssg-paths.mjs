import { readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

// vite-ssg 在 nested 模式下会把非 ASCII 路由写成 %E7%99%BD... 这样的目录名，
// 但静态服务器会先解码请求路径再找文件，导致 /posts/中文标题/ 404。
// 构建后把目录名还原成真实 Unicode 字符。
const root = process.argv[2] || 'dist'

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory())
      continue
    const full = join(dir, entry.name)
    await walk(full)
    if (!/%[0-9A-Fa-f]{2}/.test(entry.name))
      continue
    let decoded
    try {
      decoded = decodeURIComponent(entry.name)
    }
    catch {
      continue
    }
    if (decoded === entry.name)
      continue
    try {
      await rename(full, join(dir, decoded))
      console.log(`[ssg] fixed path: ${entry.name} -> ${decoded}`)
    }
    catch (e) {
      console.warn(`[ssg] skip ${full}: ${e.message}`)
    }
  }
}

await walk(root)
