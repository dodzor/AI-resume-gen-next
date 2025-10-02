'use client'

interface FormProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  setGeneratedResume: (resume: string) => void
}

export default function Form({ 
  formData, 
  setFormData, 
  isGenerating, 
  setIsGenerating, 
  setGeneratedResume 
}: FormProps) {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({
          ...prev,
          [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsGenerating(true)
        
        try {
            const response = await fetch('/api/generate-resume', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
            throw new Error(data.message || 'Failed to generate resume')
            }
        
            setGeneratedResume(data.resume)
        } catch (error) {
            console.error('Error generating resume:', error)
            setGeneratedResume(`
                <div class="text-red-600 p-4 border border-red-300 rounded-lg bg-red-50">
                <h3 class="font-semibold mb-2">Error Generating Resume</h3>
                <p>${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}</p>
                </div>
            `)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                Your Information
            </h2>
    
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input 
                            name="name" 
                            type="text"
                            placeholder="John Doe"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input 
                            name="email" 
                            type="email"
                            placeholder="john.doe@example.com" 
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        />
                    </div>
                </div>

                {/* Experience */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                    <textarea 
                        name="experience" 
                        placeholder="• Software Developer at Tech Corp (2020-2023)&#10;  - Built web applications using React and Node.js&#10;  - Improved system performance by 40%&#10;&#10;• Junior Developer at StartupXYZ (2019-2020)&#10;  - Developed mobile apps using React Native"
                        required
                        rows={6}
                        value={formData.experience}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                    />
                </div>

                {/* Skills */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                    <textarea 
                        name="skills" 
                        placeholder="JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Problem Solving, Team Leadership"
                        required
                        rows={4}
                        value={formData.skills}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                    />
                </div>

                {/* Target Job */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Job Description</label>
                    <textarea 
                        name="job" 
                        placeholder="Senior Full Stack Developer position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms."
                        required
                        rows={5}
                        value={formData.job}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                    />
                </div>

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <span>Generate Resume</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
