'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import { TemplateId } from './templates'

// Use react-pdf's built-in Helvetica font (similar to Inter, no external loading required)
const FONT_FAMILY = 'Helvetica'

// Resume data structure
export interface ResumeData {
  name: string
  contactInfo: string[]
  summary: string
  experience: Array<{
    title: string
    description: string
  }>
  portfolio?: Array<{
    title: string
    description: string
    links?: string
  }>
  skills: string[]
  education: Array<{
    degree: string
    school: string
    details?: string
  }>
}

// ============================================
// PROFESSIONAL BLUE TEMPLATE
// Aligned with browser CSS from styles/resume-display.css
// ============================================
const professionalBlueStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: FONT_FAMILY,
    fontSize: 11, // Base font size for paragraphs
    lineHeight: 1.6, // Matches browser line-height: 1.6
    color: '#333', // Matches browser color: #333
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center', // Matches browser text-align: center
    marginBottom: 30, // Matches browser margin-bottom: 30px
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6', // Matches browser border-bottom: 2px solid #3b82f6
    paddingBottom: 20, // Matches browser padding-bottom: 20px
  },
  name: {
    fontSize: 24, // Matches browser font-size: 32px
    fontWeight: 700,
    color: '#1f2937', // Matches browser color: #1f2937
    marginBottom: 20,
  },
  contactInfo: {
    fontSize: 14, // Matches browser font-size: 16px
    color: '#6b7280', // Matches browser color: #6b7280
  },
  contactLink: {
    color: '#3b82f6', // Matches browser .contact-info a color: #3b82f6
    textDecoration: 'none',
  },
  section: {
    marginBottom: 25, // Matches browser margin-bottom: 25px
  },
  sectionTitle: {
    fontSize: 20, // Matches browser font-size: 20px
    fontWeight: 600,
    color: '#374151', // Matches browser color: #374151
    marginBottom: 12, // Matches browser margin-bottom: 12px
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // Matches browser border-bottom: 1px solid #e5e7eb
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 14, // Matches browser font-size: 14px
    lineHeight: 1.5, // Matches browser line-height: 1.5
    color: '#374151', // Matches browser color: #374151
    marginBottom: 8,
  },
  jobEntry: {
    marginBottom: 16, // Matches browser margin-bottom: 16px
  },
  jobTitle: {
    fontSize: 16, // Matches browser font-size: 16px
    fontWeight: 600,
    color: '#4b5563', // Matches browser color: #4b5563
    marginBottom: 6, // Matches browser margin-bottom: 6px
  },
  skillsList: {
    marginLeft: 20, // Matches browser margin-left: 20px (for list-style-type: disc)
  },
  skillItem: {
    fontSize: 14, // Matches browser font-size: 14px
    marginBottom: 4, // Matches browser margin-bottom: 4px
  },
  educationEntry: {
    marginBottom: 12, // Matches browser margin-bottom: 12px
  },
  degreeTitle: {
    fontSize: 16, // Matches browser font-size: 16px
    fontWeight: 600,
    color: '#4b5563', // Matches browser color: #4b5563
    marginBottom: 4, // Matches browser margin-bottom: 4px
  },
  schoolInfo: {
    fontSize: 14, // Matches browser font-size: 14px
    color: '#6b7280', // Matches browser color: #6b7280
    marginBottom: 6, // Matches browser margin-bottom: 6px
  },
  portfolioEntry: {
    marginBottom: 16, // Matches browser margin-bottom: 16px
  },
  projectTitle: {
    fontSize: 16, // Matches browser font-size: 16px
    fontWeight: 600,
    color: '#4b5563', // Matches browser color: #4b5563
    marginBottom: 6, // Matches browser margin-bottom: 6px
  },
  projectLinks: {
    fontSize: 13, // Matches browser font-size: 13px
    color: '#3b82f6', // Matches browser color: #3b82f6
    marginTop: 4, // Matches browser margin-top: 4px
  },
})

// ============================================
// MODERN MINIMAL TEMPLATE
// ============================================
const modernMinimalStyles = StyleSheet.create({
  page: {
    padding: 45,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 25,
    textAlign: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111111',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  contactInfo: {
    fontSize: 10,
    color: '#666666',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111111',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333333',
    marginBottom: 8,
  },
  jobEntry: {
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111111',
    marginBottom: 4,
  },
  skillsText: {
    fontSize: 11,
    color: '#333333',
  },
  educationEntry: {
    marginBottom: 10,
  },
  degreeTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111111',
    marginBottom: 2,
  },
  schoolInfo: {
    fontSize: 10,
    color: '#666666',
    fontStyle: 'italic',
  },
})

// ============================================
// CREATIVE DESIGNER TEMPLATE
// ============================================
const creativeDesignerStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: '#1a1a2e',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 25,
  },
  name: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1a1a2e',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 11,
    color: '#5c5c6d',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#E85A4F',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#3d3d54',
    marginBottom: 8,
  },
  jobEntry: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: '#E85A4F',
    borderRadius: 4,
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillItem: {
    fontSize: 10,
    fontWeight: 600,
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    padding: '6 14',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  educationEntry: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: '#4a4a5e',
    borderRadius: 4,
  },
  degreeTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  schoolInfo: {
    fontSize: 10,
    color: '#5c5c6d',
    fontStyle: 'italic',
  },
  portfolioEntry: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff8f7',
    borderRadius: 6,
  },
  projectTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#E85A4F',
    marginBottom: 4,
  },
})

// ============================================
// DEVELOPER TEMPLATE
// ============================================
const developerStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  contactInfo: {
    fontSize: 10,
    color: '#4b5563',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151',
    marginBottom: 8,
  },
  jobEntry: {
    marginBottom: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
  },
  bulletList: {
    marginLeft: 10,
  },
  bulletItem: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillItem: {
    fontSize: 10,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '4 10',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  educationEntry: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
  },
  degreeTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 2,
  },
  schoolInfo: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },
})

// ============================================
// TEMPLATE COMPONENTS
// ============================================

function ProfessionalBlueTemplate({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={professionalBlueStyles.page}>
        {/* Header */}
        <View style={professionalBlueStyles.header}>
          <Text style={professionalBlueStyles.name}>{data.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {data.contactInfo.map((item, index) => {
              const isEmail = item.includes('@')
              const isUrl = item.startsWith('http://') || item.startsWith('https://')
              
              return (
                <React.Fragment key={index}>
                  {index > 0 && <Text> | </Text>}
                  {isEmail || isUrl ? (
                    <Link src={isEmail ? `mailto:${item}` : item} style={professionalBlueStyles.contactLink}>
                      {item}
                    </Link>
                  ) : (
                    <Text style={professionalBlueStyles.contactInfo}>{item}</Text>
                  )}
                </React.Fragment>
              )
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={professionalBlueStyles.section}>
          <Text style={professionalBlueStyles.sectionTitle}>Summary</Text>
          <Text style={professionalBlueStyles.paragraph}>{data.summary}</Text>
        </View>

        {/* Experience */}
        <View style={professionalBlueStyles.section}>
          <Text style={professionalBlueStyles.sectionTitle}>Work Experience</Text>
          {data.experience.map((job, index) => (
            <View key={index} style={professionalBlueStyles.jobEntry}>
              <Text style={professionalBlueStyles.jobTitle}>{job.title}</Text>
              <Text style={professionalBlueStyles.paragraph}>{job.description}</Text>
            </View>
          ))}
        </View>

        {/* Portfolio (if exists) */}
        {data.portfolio && data.portfolio.length > 0 && (
          <View style={professionalBlueStyles.section}>
            <Text style={professionalBlueStyles.sectionTitle}>Portfolio / Projects</Text>
            {data.portfolio.map((project, index) => (
              <View key={index} style={professionalBlueStyles.portfolioEntry}>
                <Text style={professionalBlueStyles.projectTitle}>{project.title}</Text>
                <Text style={professionalBlueStyles.paragraph}>{project.description}</Text>
                {project.links && (
                  <Text style={professionalBlueStyles.projectLinks}>{project.links}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Skills - Browser uses bulleted list */}
        <View style={professionalBlueStyles.section}>
          <Text style={professionalBlueStyles.sectionTitle}>Skills</Text>
          <View style={professionalBlueStyles.skillsList}>
            {data.skills.map((skill, index) => (
              <Text key={index} style={professionalBlueStyles.skillItem}>
                • {skill}
              </Text>
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={professionalBlueStyles.section}>
          <Text style={professionalBlueStyles.sectionTitle}>Education</Text>
          {data.education.map((edu, index) => (
            <View key={index} style={professionalBlueStyles.educationEntry}>
              <Text style={professionalBlueStyles.degreeTitle}>{edu.degree}</Text>
              <Text style={professionalBlueStyles.schoolInfo}>{edu.school}</Text>
              {edu.details && <Text style={professionalBlueStyles.paragraph}>{edu.details}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

function ModernMinimalTemplate({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={modernMinimalStyles.page}>
        {/* Header */}
        <View style={modernMinimalStyles.header}>
          <Text style={modernMinimalStyles.name}>{data.name}</Text>
          <Text style={modernMinimalStyles.contactInfo}>
            {data.contactInfo.join(' · ')}
          </Text>
        </View>

        {/* Summary */}
        <View style={modernMinimalStyles.section}>
          <Text style={modernMinimalStyles.sectionTitle}>Summary</Text>
          <Text style={modernMinimalStyles.paragraph}>{data.summary}</Text>
        </View>

        {/* Experience */}
        <View style={modernMinimalStyles.section}>
          <Text style={modernMinimalStyles.sectionTitle}>Work Experience</Text>
          {data.experience.map((job, index) => (
            <View key={index} style={modernMinimalStyles.jobEntry}>
              <Text style={modernMinimalStyles.jobTitle}>{job.title}</Text>
              <Text style={modernMinimalStyles.paragraph}>{job.description}</Text>
            </View>
          ))}
        </View>

        {/* Portfolio */}
        {data.portfolio && data.portfolio.length > 0 && (
          <View style={modernMinimalStyles.section}>
            <Text style={modernMinimalStyles.sectionTitle}>Portfolio / Projects</Text>
            {data.portfolio.map((project, index) => (
              <View key={index} style={modernMinimalStyles.jobEntry}>
                <Text style={modernMinimalStyles.jobTitle}>{project.title}</Text>
                <Text style={modernMinimalStyles.paragraph}>{project.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        <View style={modernMinimalStyles.section}>
          <Text style={modernMinimalStyles.sectionTitle}>Skills</Text>
          <Text style={modernMinimalStyles.skillsText}>
            {data.skills.join(' · ')}
          </Text>
        </View>

        {/* Education */}
        <View style={modernMinimalStyles.section}>
          <Text style={modernMinimalStyles.sectionTitle}>Education</Text>
          {data.education.map((edu, index) => (
            <View key={index} style={modernMinimalStyles.educationEntry}>
              <Text style={modernMinimalStyles.degreeTitle}>{edu.degree}</Text>
              <Text style={modernMinimalStyles.schoolInfo}>{edu.school}</Text>
              {edu.details && <Text style={modernMinimalStyles.paragraph}>{edu.details}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

function CreativeDesignerTemplate({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={creativeDesignerStyles.page}>
        {/* Header */}
        <View style={creativeDesignerStyles.header}>
          <Text style={creativeDesignerStyles.name}>{data.name}</Text>
          <Text style={creativeDesignerStyles.contactInfo}>
            {data.contactInfo.join(' | ')}
          </Text>
        </View>

        {/* Summary */}
        <View style={creativeDesignerStyles.section}>
          <Text style={creativeDesignerStyles.sectionTitle}>Summary</Text>
          <Text style={creativeDesignerStyles.paragraph}>{data.summary}</Text>
        </View>

        {/* Experience */}
        <View style={creativeDesignerStyles.section}>
          <Text style={creativeDesignerStyles.sectionTitle}>Work Experience</Text>
          {data.experience.map((job, index) => (
            <View key={index} style={creativeDesignerStyles.jobEntry}>
              <Text style={creativeDesignerStyles.jobTitle}>{job.title}</Text>
              <Text style={creativeDesignerStyles.paragraph}>{job.description}</Text>
            </View>
          ))}
        </View>

        {/* Portfolio */}
        {data.portfolio && data.portfolio.length > 0 && (
          <View style={creativeDesignerStyles.section}>
            <Text style={creativeDesignerStyles.sectionTitle}>Portfolio / Projects</Text>
            {data.portfolio.map((project, index) => (
              <View key={index} style={creativeDesignerStyles.portfolioEntry}>
                <Text style={creativeDesignerStyles.projectTitle}>{project.title}</Text>
                <Text style={creativeDesignerStyles.paragraph}>{project.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        <View style={creativeDesignerStyles.section}>
          <Text style={creativeDesignerStyles.sectionTitle}>Skills</Text>
          <View style={creativeDesignerStyles.skillsContainer}>
            {data.skills.map((skill, index) => (
              <Text key={index} style={creativeDesignerStyles.skillItem}>{skill}</Text>
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={creativeDesignerStyles.section}>
          <Text style={creativeDesignerStyles.sectionTitle}>Education</Text>
          {data.education.map((edu, index) => (
            <View key={index} style={creativeDesignerStyles.educationEntry}>
              <Text style={creativeDesignerStyles.degreeTitle}>{edu.degree}</Text>
              <Text style={creativeDesignerStyles.schoolInfo}>{edu.school}</Text>
              {edu.details && <Text style={creativeDesignerStyles.paragraph}>{edu.details}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

function DeveloperTemplate({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={developerStyles.page}>
        {/* Header */}
        <View style={developerStyles.header}>
          <Text style={developerStyles.name}>{data.name}</Text>
          <Text style={developerStyles.contactInfo}>
            {data.contactInfo.join(' | ')}
          </Text>
        </View>

        {/* Summary */}
        <View style={developerStyles.section}>
          <Text style={developerStyles.sectionTitle}>Summary</Text>
          <Text style={developerStyles.paragraph}>{data.summary}</Text>
        </View>

        {/* Experience */}
        <View style={developerStyles.section}>
          <Text style={developerStyles.sectionTitle}>Work Experience</Text>
          {data.experience.map((job, index) => (
            <View key={index} style={developerStyles.jobEntry}>
              <Text style={developerStyles.jobTitle}>{job.title}</Text>
              <Text style={developerStyles.paragraph}>{job.description}</Text>
            </View>
          ))}
        </View>

        {/* Portfolio */}
        {data.portfolio && data.portfolio.length > 0 && (
          <View style={developerStyles.section}>
            <Text style={developerStyles.sectionTitle}>Projects</Text>
            {data.portfolio.map((project, index) => (
              <View key={index} style={developerStyles.jobEntry}>
                <Text style={developerStyles.jobTitle}>{project.title}</Text>
                <Text style={developerStyles.paragraph}>{project.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        <View style={developerStyles.section}>
          <Text style={developerStyles.sectionTitle}>Technical Skills</Text>
          <View style={developerStyles.skillsContainer}>
            {data.skills.map((skill, index) => (
              <Text key={index} style={developerStyles.skillItem}>{skill}</Text>
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={developerStyles.section}>
          <Text style={developerStyles.sectionTitle}>Education</Text>
          {data.education.map((edu, index) => (
            <View key={index} style={developerStyles.educationEntry}>
              <Text style={developerStyles.degreeTitle}>{edu.degree}</Text>
              <Text style={developerStyles.schoolInfo}>{edu.school}</Text>
              {edu.details && <Text style={developerStyles.paragraph}>{edu.details}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// TEMPLATE SELECTOR
// ============================================

export function getResumeTemplate(templateId: TemplateId, data: ResumeData) {
  switch (templateId) {
    case 'professional-blue':
      return <ProfessionalBlueTemplate data={data} />
    case 'modern-minimal':
      return <ModernMinimalTemplate data={data} />
    case 'creative-designer':
      return <CreativeDesignerTemplate data={data} />
    case 'developer':
      return <DeveloperTemplate data={data} />
    default:
      return <ProfessionalBlueTemplate data={data} />
  }
}
