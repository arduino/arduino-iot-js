import { IHttpClient } from './IHttpClient';

type Fetch = (url: string, init?: any) => Promise<any>;

export class HttpClientFactory {
  public static Create(fetch: Fetch): IHttpClient {
    return new (class implements IHttpClient {
      post<T, P>(uri: string, body: P, headers?: { [key: string]: string }): Promise<T> {
        return this.execute(uri, 'post', body, headers);
      }

      private async execute<T>(
        url: string,
        method: string,
        body?: any,
        headers?: { [key: string]: string }
      ): Promise<T> {
        const response = await fetch(url, { method, body, headers });
        const responseHeaders = this.mapFrom(response.headers);

        const text = await response.text();
        const contentType = responseHeaders['content-type'] || '';
        const payload = contentType.match('json') && !!text ? JSON.parse(text) : text;

        if (response.status >= 400) throw new Error(JSON.stringify({ payload, status: response.status }));
        else return payload;
      }

      private mapFrom(headers: any): { [key: string]: string } {
        const mapped = {};
        headers.forEach((v, n) => (mapped[n] = v));
        return mapped;
      }
    })();
  }
}
