"use client";

import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import Products from "../components/Products";
import Services from "../components/Services";
import About from "../components/About";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

const Hero = dynamic(() => import("../components/Hero"), { ssr: false });

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Products />
        <Services />
        <About />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
