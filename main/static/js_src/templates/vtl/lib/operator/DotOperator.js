class DotOperator extends Operator
{
    static runnable = (l, r)=>
    {
        let value = l[r];
        if (value instanceof Function)
        {
            value = value.bind(l);
        }
        return value;
    };
    static sign = ".";
    static priority = 10;

    static use_raw_right = true;

    constructor()
    {
        super();
    }
}
