import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Products from "./components/Products.jsx";
import Services from "./components/Services.jsx";
import About from "./components/About.jsx";
import CTASection from "./components/CTASection.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
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