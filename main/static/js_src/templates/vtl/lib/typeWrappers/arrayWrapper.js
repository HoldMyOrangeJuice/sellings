// same as array but has evaluate method for compatability
class ArrayWrapper extends Operand
{
    constructor(array)
    {
        super(array);
    }

    push(e)
    {
        this.expression.push(e);
    }

    evaluate(context)
    {
        // contents of array are already evaluated
        return this.expression;
    }
}
