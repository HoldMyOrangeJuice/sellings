class LogicalTag extends Tag
{
    evaluate(render_context)
    {
        return !!super.evaluate(render_context);
    }
}
