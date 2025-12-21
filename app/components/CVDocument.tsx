/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Link, Font } from '@react-pdf/renderer';
import { PROFILE, EDUCATION, PUBLICATIONS, AWARDS, ACADEMIC_SERVICE } from '@/app/lib/data';

// Register fonts if needed. Using standard Helvetica for now which is built-in and safe.
// For Korean support, we would need to register a Korean font.
// Since the content is English-centric for CV, we'll stick to standard fonts for simplicity first.
// If Korean characters are needed, we must register a font.
// The user's prompt was mixed, but the CV content is mostly English. 
// "이건 한국 전화번호야" (This is a Korean phone number) implies the user communicates in Korean but the CV might be English.
// Let's assume English CV for international use, but if there are Korean chars, they won't render in Helvetica.
// We'll trust the provided content is English or standard chars.

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10, // Base font size
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
    },
    name: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        color: '#4b5563', // gray-600
        fontSize: 9,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginTop: 15,
        marginBottom: 8,
        textTransform: 'uppercase',
        color: '#111827', // gray-900
        borderBottom: 1,
        borderBottomColor: '#eee',
        paddingBottom: 2,
    },
    sectioncontent: {
        marginBottom: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    educationItem: {
        marginBottom: 4,
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
    },
    pubItem: {
        marginBottom: 8,
    },
    pubTitle: {
        fontFamily: 'Helvetica-Bold',
    },
    pubAuthors: {
        color: '#374151', // gray-700
    },
    pubVenue: {
        fontStyle: 'italic',
        color: '#4b5563', // gray-600
    },
    awardItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    serviceItem: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    link: {
        color: '#2563eb', // blue-600
        textDecoration: 'none',
    },
});

// Create Document Component
const CVDocument = () => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.name}>{PROFILE.name}</Text>
                <View style={styles.headerInfo}>
                    <View>
                        <Text>{PROFILE.role}, {PROFILE.affiliation}</Text>
                        <Text>{PROFILE.address}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text>{PROFILE.email}</Text>
                        <Text>{PROFILE.phone}</Text>
                        <Link src={PROFILE.website || '#'} style={styles.link}>
                            {PROFILE.website}
                        </Link>
                    </View>
                </View>
            </View>

            {/* Research Interests (from Bio) - Optional but good for CV */}
            <View style={styles.sectioncontent}>
                <Text style={styles.sectionTitle}>Research Interests</Text>
                <Text style={{ marginBottom: 4 }}>
                    Bridging optimization theory and modern generative AI. Training dynamics of overparameterized networks, inductive biases, Diffusion Models, and LLMs.
                </Text>
            </View>

            {/* Education */}
            <View style={styles.sectioncontent}>
                <Text style={styles.sectionTitle}>Education</Text>
                {EDUCATION.map((edu, index) => (
                    <View key={index} style={styles.educationItem}>
                        <View style={styles.row}>
                            <Text style={styles.bold}>{edu.degree}</Text>
                            <Text style={{ fontFamily: 'Helvetica-Oblique' }}>{edu.period}</Text>
                        </View>
                        <Text>{edu.institution}</Text>
                    </View>
                ))}
            </View>

            {/* Publications */}
            <View style={styles.sectioncontent}>
                <Text style={styles.sectionTitle}>Publications</Text>
                {PUBLICATIONS.map((section, secIndex) => (
                    <View key={secIndex} style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#374151' }}>
                            {section.section} {section.note && <Text style={{ fontSize: 9, fontWeight: 'normal', fontFamily: 'Helvetica' }}>{section.note}</Text>}
                        </Text>
                        {section.items.map((pub, pubIndex) => (
                            <View key={pubIndex} style={styles.pubItem}>
                                <Text style={styles.pubTitle}>{pub.title}</Text>
                                <Text style={styles.pubAuthors}>{pub.authors.join(", ")}</Text>
                                <Text style={styles.pubVenue}>{pub.venue} {pub.year}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </View>

            {/* Awards */}
            <View style={styles.sectioncontent}>
                <Text style={styles.sectionTitle}>Awards & Honors</Text>
                {AWARDS.map((award, index) => (
                    <View key={index} style={styles.awardItem}>
                        <Text style={{ width: '85%' }}>• {award.title}</Text>
                        <Text style={{ fontFamily: 'Helvetica-Oblique' }}>{award.year}</Text>
                    </View>
                ))}
            </View>

            {/* Academic Service */}
            <View style={styles.sectioncontent}>
                <Text style={styles.sectionTitle}>Academic Service</Text>
                {ACADEMIC_SERVICE.map((service, index) => (
                    <View key={index} style={styles.serviceItem}>
                        <Text style={{ width: '30%', fontFamily: 'Helvetica-Bold' }}>{service.role}</Text>
                        <Text style={{ width: '70%' }}>{service.venue} ({service.year})</Text>
                    </View>
                ))}
            </View>

            {/* Footer / References */}
            <View style={{ marginTop: 20, borderTop: 1, borderTopColor: '#eee', paddingTop: 10 }}>
                <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 8 }}>
                    References available upon request
                </Text>
            </View>

        </Page>
    </Document>
);

export default CVDocument;
