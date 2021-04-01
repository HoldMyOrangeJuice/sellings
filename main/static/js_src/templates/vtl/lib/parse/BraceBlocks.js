class BraceBlock extends Expression
{
    static braces = "not implenented";
    static braceBlocks = [
        "RoundBracketBlock",
        "CurlyBracketBlock",
        "SquareBracketBlock"
    ]

    constructor(content)
    {
        super(content);
    }

    static isOpenBrace(c)
    {
        for (let classname of this.braceBlocks)
        {
            let cls = this.resolve(classname);
            if (cls.braces[0] === c)
                return true;
        }
        return false;
    }

    static isCloseBrace(c)
    {
        for (let classname of this.braceBlocks)
        {
            let cls = this.resolve(classname);
            if (cls.braces[1] === c)
                return true;
        }
        return false;
    }

    static getType(brace)
    {
        for (let classname of this.braceBlocks)
        {
            let cls = this.resolve(classname);
            if (cls.braces[0] == brace)
                return cls;
        }
    }
}

class RoundBracketBlock extends BraceBlock
{
    static braces = "()";
    constructor(a)
    {
        super(a);
    }
}

class CurlyBracketBlock extends BraceBlock
{
    static braces = "{}";
    constructor(a)
    {
        super(a);
    }
}

class SquareBracketBlock extends BraceBlock
{
    static braces = "[]";
    constructor(a)
    {
        super(a);
    }
}
