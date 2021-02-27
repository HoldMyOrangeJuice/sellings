window.onerror = (msg, url, lineNo, columnNo, error) =>
{
    data = `${msg} at ${url}: line ${lineNo}:${columnNo} Version ${VERSION}`
    try
    {
        fetch(`/error?data=${data}`)
        notify(data);
    }
    catch(e)
    {
        //notify(data);
    }
}

function notify(data)
{
    $("#error-log").text(data);
    $('#errorModal').modal({
        show: true
    });
}
