import { readFileSync } from "node:fs"

type DatabaseSslEnvironment = Readonly<Record<string, string | undefined>>

export function normalizeCertificatePem(value: string) {
  return value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim() + "\n"
}

export function loadDatabaseCertificateAuthority(
  env: DatabaseSslEnvironment = process.env,
  readSecretFile: (path: string) => string = (path) =>
    readFileSync(path, "utf8")
) {
  const sources = [
    env.DATABASE_SSL_CA_BASE64?.trim() ? "base64" : null,
    env.DATABASE_SSL_CA_PEM?.trim() ? "pem" : null,
    env.DATABASE_SSL_CA_FILE?.trim() ? "file" : null,
  ].filter(Boolean)
  if (sources.length > 1)
    throw new Error("Configure exactly one database CA source")
  if (sources[0] === "base64")
    return normalizeCertificatePem(
      Buffer.from(env.DATABASE_SSL_CA_BASE64!.trim(), "base64").toString("utf8")
    )
  if (sources[0] === "pem")
    return normalizeCertificatePem(env.DATABASE_SSL_CA_PEM!.trim())
  if (sources[0] === "file")
    return normalizeCertificatePem(
      readSecretFile(env.DATABASE_SSL_CA_FILE!.trim())
    )
  return undefined
}
