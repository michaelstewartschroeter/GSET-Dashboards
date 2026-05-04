const PlaceholderDashboard: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 bg-dark-card border border-dark-border rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🚧</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-gray-400 mb-6">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-cyan/10 border border-primary-cyan/30 rounded-md text-primary-cyan text-sm">
          Coming Soon
        </div>
      </div>
    </div>
  );
};

export default PlaceholderDashboard;
