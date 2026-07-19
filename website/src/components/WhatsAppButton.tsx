import { buildWhatsAppUrl } from '@/config/site';

// Floating click-to-chat button — the highest-converting single addition for
// a local clinic site in India, where patients strongly prefer WhatsApp over
// forms/calls for a first enquiry.
export function WhatsAppButton() {
  const href = buildWhatsAppUrl("Hi, I'd like to book a consultation at Lumine Aesthetics.");
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 md:bottom-6"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="h-7 w-7">
        <path d="M16.004 3C9.376 3 4 8.373 4 15c0 2.475.752 4.775 2.04 6.687L4.6 27.4l5.86-1.535A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3zm0 21.75a9.7 9.7 0 0 1-4.95-1.36l-.355-.21-3.478.911.93-3.393-.232-.35A9.71 9.71 0 1 1 25.71 15c0 5.376-4.373 9.75-9.706 9.75zm5.34-7.29c-.293-.147-1.735-.856-2.005-.953-.27-.098-.466-.147-.663.147-.196.293-.76.953-.932 1.15-.171.196-.343.22-.636.073-.293-.147-1.238-.456-2.36-1.456-.872-.778-1.462-1.738-1.633-2.03-.171-.294-.018-.453.129-.6.132-.132.293-.343.44-.514.147-.171.196-.294.293-.49.098-.196.049-.368-.024-.514-.073-.147-.663-1.598-.908-2.188-.239-.575-.482-.497-.663-.506-.171-.008-.368-.01-.564-.01-.196 0-.514.073-.784.368-.27.294-1.03 1.007-1.03 2.456s1.055 2.848 1.202 3.045c.147.196 2.077 3.17 5.032 4.444.703.303 1.252.484 1.68.62.706.225 1.348.193 1.856.117.566-.084 1.735-.71 1.98-1.395.245-.685.245-1.273.171-1.395-.073-.122-.269-.196-.563-.343z" />
      </svg>
    </a>
  );
}
