export type AuthUser = {
  id: string
  username: string
  email: string | null
}

export type AuthPayload = {
  user: AuthUser
  access_token: string
  token_type: string
}
