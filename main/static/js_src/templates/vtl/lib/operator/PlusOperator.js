class PlusOperator extends Operator
{
    static runnable = (l, r)=>l+r;
    static sign = "+";
    static priority = 1;
    constructor()
    {
        super();
    }
}
