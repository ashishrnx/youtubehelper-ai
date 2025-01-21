import React from "react";

const Navbar = () => {
  return (
    <nav className="flex  justify-between w-full p-4 bg-rose-950 text-rose-100">
      <div className="flex items-center space-x-2">
        
        {/* <img src="/logo.svg" alt="Logo" className="h-8 w-8" /> */}
 
        <h1 className="text-3xl font-bold">TubeInSight</h1>
      </div>
    </nav>
  );
};

export default Navbar;
