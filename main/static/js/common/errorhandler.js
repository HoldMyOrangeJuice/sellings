window.onerror = (msg, url, lineNo, columnNo, error) =>
{
    let data = `${msg} at ${url}:<lnb>line ${lineNo}:${columnNo}<lnb>Version ${VERSION}<lnb>`
    try
    {
        fetch(`/api/user/error?data=${data}`)
    }
    catch(e)
    {
        notify(data + "\nWhile handling above, this happened:\n" + e);
    }
}

function notify(data)
{
    $("#error-log").text(data);
    $('#errorModal').modal({
        show: true
    });
}
