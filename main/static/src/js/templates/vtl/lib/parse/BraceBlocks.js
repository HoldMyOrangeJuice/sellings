import Expression from "../evaluate/Expression"
import Linker from "../core/Linker"

export class BraceBlock extends Expression
{
    static braces = "not implenented";

    constructor(content)
    {
        super(content);
    }

    static isOpenBrace(c)
    {
        for (let classname of Linker.getBraceBlocks())
        {
            let cls = classname;
            if (cls.braces[0] === c)
                return true;
        }
        return false;
    }

    static isCloseBrace(c)
    {
        for (let classname of Linker.getBraceBlocks())
        {
            let cls = classname;
            if (cls.braces[1] === c)
                return true;
        }
        return false;
    }

    static getType(brace)
    {
        for (let classname of Linker.getBraceBlocks())
        {
            let cls = classname;
            if (cls.braces[0] == brace)
                return cls;
        }
    }
}

export class RoundBracketBlock extends BraceBlock
{
    static braces = "()";
    constructor(a)
    {
        super(a);
    }
}

export class CurlyBracketBlock extends BraceBlock
{
    static braces = "{}";
    constructor(a)
    {
        super(a);
    }
}

export class SquareBracketBlock extends BraceBlock
{
    static braces = "[]";
    constructor(a)
    {
        super(a);
    }
}
