import { randomUUID } from "node:crypto"

export type ApiErrorBody = {
  success: false
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string[]>
  }
}

export type ApiSuccessBody<Data> = {
  success: true
  data: Data
}

export type ApiResponse<Data> = ApiSuccessBody<Data> | ApiErrorBody

type ResponseOptions = {
  requestId?: string
  headers?: HeadersInit
}

function responseInit(status: number, options?: ResponseOptions) {
  const headers = new Headers(options?.headers)
  headers.set("X-Request-ID", options?.requestId ?? randomUUID())
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-store")
  return { status, headers }
}

export function apiSuccess<Data>(
  data: Data,
  status = 200,
  options?: ResponseOptions
) {
  return Response.json(
    { success: true, data } satisfies ApiSuccessBody<Data>,
    responseInit(status, options)
  )
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
  options?: ResponseOptions
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
      },
    } satisfies ApiErrorBody,
    responseInit(status, options)
  )
}
