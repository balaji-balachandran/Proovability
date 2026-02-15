const Hero = () => {
  return (
    <section className="flex min-h-[70vh] items-center px-8 md:px-16">
      <div className="max-w-2xl">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none text-foreground">
          Provability |
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-primary font-medium">
          Provable rewards for builders
        </p>
        <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
          Submit bounties for AI models with cryptographic proof of performance. 
          Builders train, prove, and earn.
        </p>
      </div>
    </section>
  );
};

export default Hero;
