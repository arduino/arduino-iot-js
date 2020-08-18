export interface IHttpClient {
  post<T, P = any>(uri: string, body: P, headers?: { [key: string]: string }): Promise<T>;
}
