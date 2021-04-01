class ElseTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "else";
    static mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
