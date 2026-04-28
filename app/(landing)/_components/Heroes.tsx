import Image from "next/image";

export const Heroes = () => {
  return (
    <div className="flex max-w-5xl flex-col items-center justify-center">
      <div className="flex items-center">
        <div className="relative h-52 w-52 sm:h-72 sm:w-72 md:h-96 md:w-96">
          <Image
            src="/idea.svg"
            fill
            className="object-contain dark:hidden"
            alt="Idea"
          />
          <Image
            src="/idea-dark.svg"
            fill
            className="hidden object-contain dark:block"
            alt="Idea"
          />
        </div>
        <div className="relative hidden h-96 w-96 md:block">
          <Image
            src="/team.svg"
            fill
            className="object-contain dark:hidden"
            alt="Team"
          />
          <Image
            src="/team-dark.svg"
            fill
            className="hidden object-contain dark:block"
            alt="Team"
          />
        </div>
      </div>
    </div>
  );
};
