import Main from "../components/Main";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div >
      <main className="flex flex-col  row-start-2 items-center sm:items-start">
        <Navbar />
        <Main />
      </main>
    </div>
  );
}
