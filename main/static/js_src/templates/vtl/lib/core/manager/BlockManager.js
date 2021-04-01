class BlockManager extends ClassNameResolver
{
    static getBlockClass(tag)
    {
        return this.resolve(this.resolve(tag.mainTagClass).blockClass);
    }
}
