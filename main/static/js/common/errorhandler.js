window.onerror = (msg, url, lineNo, columnNo, error) =>
{
    data = `${msg} at ${url}: line ${lineNo}:${columnNo} Version ${VERSION}`
    try
    {
        fetch(`/api/user/error?data=${data}`)
    }
    catch(e)
    {
        notify(data + "While handling above, this happened: " + e);
    }
}

function notify(data)
{
    $("#error-log").text(data);
    $('#errorModal').modal({
        show: true
    });
}
