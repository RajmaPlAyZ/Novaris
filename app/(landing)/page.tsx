import { Footer } from "./_components/Footer";
import { Heading } from "./_components/Heading";
import { Heroes } from "./_components/Heroes";
import { AvarisCredit } from "./_components/AvarisCredit";

export default function LandingPage() {
  return (
    <div className="dark:bg-dark flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-8 px-4 pb-10 text-center sm:px-6 md:justify-start">
        <Heading />
        <Heroes />
      </div>
      <AvarisCredit />
      <Footer />
    </div>
  );
}
