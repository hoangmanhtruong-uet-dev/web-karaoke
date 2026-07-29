import { describe, expect, it } from "vitest"

import {
  loadDatabaseCertificateAuthority,
  normalizeCertificatePem,
} from "@/lib/database-ssl"

describe("database SSL CA configuration", () => {
  const pem = "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----"

  it("normalizes escaped and Windows newlines", () => {
    expect(normalizeCertificatePem(pem.replace(/\n/g, "\\n"))).toBe(`${pem}\n`)
    expect(normalizeCertificatePem(pem.replace(/\n/g, "\r\n"))).toBe(`${pem}\n`)
  })

  it("loads CA from base64 or a mounted secret file", () => {
    expect(
      loadDatabaseCertificateAuthority({
        DATABASE_SSL_CA_BASE64: Buffer.from(pem).toString("base64"),
      })
    ).toBe(`${pem}\n`)
    expect(
      loadDatabaseCertificateAuthority(
        { DATABASE_SSL_CA_FILE: "/run/secrets/aiven-ca.pem" },
        (path) => {
          expect(path).toBe("/run/secrets/aiven-ca.pem")
          return pem
        }
      )
    ).toBe(`${pem}\n`)
  })

  it("rejects ambiguous CA sources", () => {
    expect(() =>
      loadDatabaseCertificateAuthority({
        DATABASE_SSL_CA_PEM: pem,
        DATABASE_SSL_CA_FILE: "/secret/ca.pem",
      })
    ).toThrow(/exactly one/)
  })
})
