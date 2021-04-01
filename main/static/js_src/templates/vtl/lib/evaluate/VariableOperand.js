class VariableOperand extends Operand
{
    static regex = /^[A-Za-z_]+[A-Za-z_0-9]*$/;
    constructor(expression)
    {
        super(expression);
    }

    evaluate(context)
    {
        return getValue(this.expression, context);
    }

}
