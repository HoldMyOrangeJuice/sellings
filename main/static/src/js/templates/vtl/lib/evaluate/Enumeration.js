class Enumeration extends Operand
{
    static regex = /.*,.*/;

    constructor(content)
    {
        super(content);
        this.content = []
        this.trailing = false;
    }

    evaluate(context)
    {
        let result = [];
        let temp = "";
        for (let char of this.expression)
        {
            if (char != ",")
            {
                temp += char;
            }
            else
            {
                if(parseFloat(temp) == temp)
                    result.push(parseFloat(temp))
                else
                    result.push(temp)
                temp = "";
            }
        }
        this.trailing = temp.replaceAll(" ", "") == ""

        if (!this.trailing)
        {
            result.push(temp)
        }
        
        return result;
    }
}
