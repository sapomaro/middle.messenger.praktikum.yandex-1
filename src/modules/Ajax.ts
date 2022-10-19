import {isPlainObject, isArrayOrObject, PlainObject} from './Utils';

enum METHOD {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

type Fn = (...args: Array<unknown>) => void;

type InitOptions = {
  url?: string;
  method?: METHOD;
  tries?: number;
  timeout?: number;
  headers?: Record<string, string>;
  data?: unknown;
}

type Options = InitOptions & {
  //data?: unknown;
  successCallback: Fn;
  errorHandler: Fn;
};

type Handler = {
  (callback: Fn): AjaxState;
  trigger: () => void;
  callbacks: Array<Fn>;
}

export type AjaxState = InitOptions & {
  then: Handler;
  catch: Handler;
  finally: Handler;
  xhr?: XMLHttpRequest;
  options?: Record<string, unknown>;
  responseText?: string;
  responseHeaders?: Record<string, string>;
  responseJSON?: Record<string, unknown>;
  status?: number;
  error?: Error;
};

const ajax = function(options: InitOptions): AjaxState {
  const request: AjaxState = {
    url: options.url,
    options,
    then: (() => {
      const handler: Handler = (callback: Fn): AjaxState => {
        handler.callbacks.push(callback);
        return request;
      };
      handler.callbacks = [];
      handler.trigger = (): void => {
        for (const callback of handler.callbacks) {
          try {
            callback(request);
          } catch (error) {
            request.error = error;
            request.catch.trigger();
            break;
          }
        }
        request.finally.trigger();
      };
      return handler;
    })(),

    catch: (() => {
      const handler: Handler = (callback: Fn): AjaxState => {
        handler.callbacks = [callback];
        return request;
      };
      handler.callbacks = [() => undefined];
      handler.trigger = (): void => {
        handler.callbacks[0](request);
        request.finally.trigger();
      };
      return handler;
    })(),

    finally: (() => {
      const handler: Handler = (callback: Fn): AjaxState => {
        handler.callbacks = [callback];
        return request;
      };
      handler.callbacks = [() => undefined];
      handler.trigger = (): void => {
        handler.callbacks[0](request);
      };
      return handler;
    })(),
  };

  try {
    request.xhr = ajaxRequest(request.url ?? '', {
      ...(request.options || {}),
      successCallback: ({
        responseText,
        responseHeaders,
        responseJSON,
        status,
      }): void => {
        request.responseText = responseText;
        request.responseHeaders = responseHeaders;
        request.responseJSON = responseJSON;
        request.status = status;
        request.then.trigger();
      },
      errorHandler: (error: Error | AjaxState): void => {
        if (error instanceof Error) {
          request.error = error;
        } else {
          request.status = error.status;
          request.responseText = error.responseText;
          request.responseHeaders = error.responseHeaders;
          request.responseJSON = error.responseJSON;
        }
        request.catch.trigger();
      },
    });
  } catch (error) {
    request.error = error;
    request.catch.trigger();
  }

  return request;
};

ajax.baseUrl = '';

ajax.get = (url: string, data?: unknown): AjaxState => {
  return ajax({url, method: METHOD.GET, data});
};
ajax.post = (url: string, data?: unknown): AjaxState => {
  return ajax({url, method: METHOD.POST, data});
};
ajax.put = (url: string, data?: unknown): AjaxState => {
  return ajax({url, method: METHOD.PUT, data});
};
ajax.delete = (url: string, data?: unknown): AjaxState => {
  return ajax({url, method: METHOD.DELETE, data});
};

const ajaxRequest = function ajaxRequest(url: string,
    options: Options) {
  const xhr = new XMLHttpRequest();
  const method = (options.method ? options.method : METHOD.GET);
  const tries = (options.tries ? --options.tries : 0);
  const data = (options.data ? options.data : '');
  const dataType = (typeof data === 'string') ? 'string' :
    (typeof data === 'object' && data instanceof FormData) ? 'formdata' :
    (isArrayOrObject(data)) ? 'json' : 'unknown';
  const urlParams = (method === METHOD.GET && dataType === 'json') ?
    getUrlParams(data as Record<string, unknown>) : '';

  xhr.open(method, ajax.baseUrl + url + urlParams, true);
  xhr.withCredentials = true;
  xhr.timeout = (options.timeout ? options.timeout : 3000);

  const headers = options.headers || {};
  if (!headers['Content-Type']) {
    if (dataType === 'json') {
      headers['Content-Type'] = 'application/json; charset = UTF-8';
    } else if (dataType === 'formdata') {
      headers['Content-Type'] = 'multipart/form-data';
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value);
  }

  const handleError = (error: unknown): void => {
    if (tries) {
      ajaxRequest(url, options);
    } else {
      if (typeof options.errorHandler === 'function') {
        options.errorHandler(error);
      }
    }
  };

  if (options.method === METHOD.GET || !data) {
    xhr.send();
  } else {
    try {
      xhr.send((dataType === 'json') ?
        JSON.stringify(data as Record<string, unknown>) :
        data as string | Blob);
    } catch (error) {
      handleError(error);
    }
  }

  xhr.onreadystatechange = (): void => {
    if (xhr.readyState === 4) {
      const responseText = xhr.responseText.replace(/^\"|\"$/g, '');
      const responseHeaders = getResponseHeaders(xhr);
      let responseJSON: Record<string, unknown> = {};
      if (responseHeaders['content-type'] &&
          responseHeaders['content-type'].indexOf('application/json') !== -1) {
        try {
          responseJSON = JSON.parse(responseText);
        } catch (error) {
          handleError(error);
        }
      }
      if (xhr.status >= 200 && xhr.status <= 299) {
        if (typeof options.successCallback === 'function') {
          options.successCallback({
            responseText,
            responseJSON,
            responseHeaders,
            status: xhr.status,
          });
        }
      } else if (xhr.status >= 400) {
        if (typeof options.errorHandler === 'function') {
          options.errorHandler({
            responseText,
            responseJSON,
            responseHeaders,
            status: xhr.status,
          });
        }
      }
    }
  };
  xhr.onabort = handleError;
  xhr.onerror = handleError;
  xhr.ontimeout = handleError;

  return xhr;
};

const getResponseHeaders = (xhr: XMLHttpRequest) => {
  const headers: Record<string, string> = {};
  const headersString = xhr.getAllResponseHeaders();
  const headersList = headersString.trim().split('\r\n');
  for (const header of headersList) {
    const [key, value] = header.split(': ');
    headers[key.toLowerCase()] = value.toLowerCase();
  }
  return headers;
};

const getKey = (key: string, parentKey?: string) => {
  return parentKey ? `${parentKey}[${key}]` : key;
}
const getParams = (data: PlainObject | [], parentKey?: string) => {
  const result: [string, string][] = [];
  for(const [key, value] of Object.entries(data)) {
    if (isArrayOrObject(value)) {
      result.push(...getParams(value, getKey(key, parentKey)));
    } else {
      result.push([getKey(key, parentKey), encodeURIComponent(String(value))]);
    }
  }
  return result;
}
const getUrlParams = (data: PlainObject) => {
  if (!isPlainObject(data)) {
    throw new Error('input must be an object');
  }
  return getParams(data).map((arr) => arr.join('=')).join('&');
}

export {ajax};
