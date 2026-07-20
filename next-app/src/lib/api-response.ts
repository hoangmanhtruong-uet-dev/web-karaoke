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

export function apiSuccess<Data>(data: Data, status = 200) {
  return Response.json({ success: true, data } satisfies ApiSuccessBody<Data>, { status })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
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
    { status }
  )
}
