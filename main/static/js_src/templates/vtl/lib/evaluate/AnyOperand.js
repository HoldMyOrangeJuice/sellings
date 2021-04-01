class AnyOperand extends Operand
{
    static matches(e)
    {
        return true;
    }

    evaluate(context)
    {
        return this.expression;
    }
}
