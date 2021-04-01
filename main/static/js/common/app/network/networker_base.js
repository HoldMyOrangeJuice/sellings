class NetworkerBase
{
    static prehandle_response(response)
    {
         if (response.alert)
         {
              Renderer.show_feedback(response.success, response.message);
         }
    }

    static async makeRequest(method, url, data)
    {
        if (typeof data === "object")
        {
            for (let key of Object.keys(data))
            {
                if (data[key] == null || data[key] == undefined){
                    delete data[key];
                }
            }
        }
        if (!url)
        {
            url = "/api"
        }

        if (method == 'GET')
        {

            let ser = typeof data == 'string'? data : jQuery.param( data )
            let response = await fetch(`${url}?${ser}`, {
                method: method,
            });
            return response;
        }
        else
        {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.onload = function () {
                  if (this.status >= 200 && this.status < 300)
                  {
                      let response = JSON.parse(xhr.response);
                      resolve(response);

                  } else {
                    reject({
                      status: this.status,
                      statusText: xhr.statusText
                    });
                  }
                };
                xhr.onerror = function () {
                  reject({
                    status: this.status,
                    statusText: xhr.statusText
                  });
                };
                xhr.send(data);
              });
        }
    }

    static async POST(data, url)
    {
        if (! (data instanceof FormData) )
        {
            let fd = new FormData();
            for ( let key of Object.keys(data) )
            {
                fd.append(key, data[key]);
            }
            data = fd;
        }
        data.append('csrfmiddlewaretoken', document.getElementsByName("csrfmiddlewaretoken")[0].value);

        let response = await this.makeRequest('POST', url, data);
        this.prehandle_response(response);
        return response;
    }

    static async GET(data, url)
    {
        let resp = await this.makeRequest('GET', url, data);
        let response = await resp.json();
        this.prehandle_response(response);
        return response;
    }
}
