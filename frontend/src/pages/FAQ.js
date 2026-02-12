import React from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqData = [
  {
    question: "What is this site?",
    answer: "The site acts as a platform to display Mike Wall's portfolio of cut gemstones, sell stones and buy stones."
  },
  {
    question: "What are Journeys?",
    answer: "Journeys are small timelines of stones being cut including before and after photos."
  },
  {
    question: "What are the years under photos in Galleries?",
    answer: "The years represent the year the gemstone was cut."
  },
  {
    question: "Are all gemstones in the galleries for sale?",
    answer: "No, many gemstones are sold or actively for sale. Please visit the shop page to see items that are for sale."
  },
  {
    question: "What is Name Your Price?",
    answer: "Name Your Price is a feature that allows previous buyers to send an offer for a gemstone. This offer notifies Mike and he can either accept or counter the offer. This back and forth can go on for an unlimited amount of turns until someone accepts or closes the negotiation."
  },
  {
    question: "How do I pay?",
    answer: "Payments are processed through Stripe online."
  },
  {
    question: "What does pay later mean?",
    answer: "The pay later feature is simply a countdown that activates when you commit to a buy. All commits generate an unpaid invoice with a pay button."
  },
  {
    question: "How are invoices paid?",
    answer: "Invoices are paid through your user account page."
  },
  {
    question: "How do I sell Gemstones?",
    answer: "There is a sell page for anyone to fill out who wish to sell bulk gemstones. Please upload photos and provide good descriptions of the gemstones, and include your phone number and email for communication."
  },
  {
    question: "How do I book services?",
    answer: "Booking is easy, you simply visit the \"Book\" page and select your type of service. Please provide a description of what you need. Once bookings are confirmed an email will be sent confirming the address to send your items to and a booking ticket number."
  }
];

const FAQItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div 
      className="border border-white/10 bg-white/5"
      data-testid={`faq-item-${index}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium pr-4 font-body" style={{ textTransform: 'none' }}>{question}</span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
          {answer}
        </div>
      </div>
    </div>
  );
};

const FAQ = () => {
  return (
    <div className="min-h-screen" data-testid="faq-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Help Center</p>
          <h1 className="page-title title-xl">Frequently Asked Questions</h1>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="pb-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto space-y-4">
            {faqData.map((faq, index) => (
              <FAQItem 
                key={index} 
                question={faq.question} 
                answer={faq.answer} 
                index={index}
              />
            ))}
          </div>

          {/* Contact Section */}
          <div className="max-w-3xl mx-auto mt-16">
            <div className="gem-card p-8 text-center">
              <HelpCircle className="w-10 h-10 mx-auto text-gray-500 mb-4" />
              <h3 className="title-sm text-xl mb-3">Still have questions?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Feel free to reach out directly for any other questions or concerns.
              </p>
              <div className="space-y-2">
                <a 
                  href="tel:4802864595"
                  className="block font-mono text-lg hover:text-gray-300 transition-colors"
                >
                  480-286-4595
                </a>
                <a 
                  href="mailto:mwall@cuttingcornersgems.com"
                  className="block text-sm text-gray-500 hover:text-white transition-colors"
                >
                  mwall@cuttingcornersgems.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
