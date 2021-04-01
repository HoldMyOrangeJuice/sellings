class IncludeTag extends Tag
{
    static related_tags = []
    static modifier = "%";
    static tag_name = "include";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        let template_name = this.clean();
        let component = CManager[template_name];

        if (!component)
        {
            return "invalid component: " + template_name;
        }
        return component.render(context);
    }
}
