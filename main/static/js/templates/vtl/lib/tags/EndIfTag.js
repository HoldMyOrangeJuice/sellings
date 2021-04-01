class EndIfTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "if";
    static mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}
