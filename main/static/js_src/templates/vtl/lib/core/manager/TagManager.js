class TagManager extends ClassNameResolver
{
    // execute tag should be last since it does not have prefix.
    // that means execute tag will match anything
    static registered_tags = [
        "LetTag", "IncludeTag", "ExecuteTag",
        "IfTag", "EndIfTag", "ElseIfTag", "ElseTag",
        "ForTag", "EndForTag"
    ];
    static getTagClass(content, ptr)
    {
        for (let tagClass of this.registered_tags)
        {
            let parser = new TagParser(content, ptr)

            let cls = this.resolve(tagClass);
            if (parser.hasTagNext(cls))
            {
                return cls;
            }
        }
        return false;
    }
}
