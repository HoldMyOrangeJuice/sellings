import Tag from "./BaseTag"
class LogicalTag extends Tag
{
    evaluate(render_context)
    {
        return !!super.evaluate(render_context);
    }
}
export default LogicalTag
