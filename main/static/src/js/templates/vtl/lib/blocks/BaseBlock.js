class Block
{
    static __mainTagClass = null;
    constructor()
    {
        this.compounds = [];
    }

    add(compund)
    {
        this.compounds.push(compund);
    }

    render()
    {
        throw new Error("Not Implenemted")
    }
}

export default Block
