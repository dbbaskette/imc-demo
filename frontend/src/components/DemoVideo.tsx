export default function DemoVideo() {
  return (
    <div className="p-8 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-6">Demo Video</h2>
      <div className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/ZchtDCs_SB4"
          title="Demo Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
