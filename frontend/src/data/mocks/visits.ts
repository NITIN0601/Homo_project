import type { PatientMedicalFile } from "../../types";
import { CLINIC } from "../../config";

export const MOCK_VISIT_SUMMARIES: Record<string, PatientMedicalFile> = {
  "usr-001": {
    patientId: "usr-001",
    patientName: "John Doe",
    firstName: "John",
    middleName: "",
    lastName: "Doe",
    age: 34,
    gender: "Male",
    bloodGroup: "O+",
    knownAllergies: ["Dust Mites", "Penicillin"],
    medicalHistory: ["Chronic Dyspepsia since 2024", "Trauma Soreness (Post-Sports)", "Constitutional Rash"],
    visits: [
      {
        id: "vis-101",
        visitDate: "Sep 15, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Acute Dyspepsia with Post-Exercise Muscle Fatigue",
        symptomsObserved: ["Bloating post meals", "Hamstring strain", "Acidity after coffee"],
        prescribedRemedies: [
          { medicineId: "m1", medicineName: "Arnica Montana", potency: "30C", dosage: "4 globules twice daily after meals", duration: "10 days" },
          { medicineId: "m3", medicineName: "Nux Vomica", potency: "30C", dosage: "4 drops post dinner", duration: "7 days" },
        ],
        clinicalNotes: "Patient reports improvement in indigestion. Prescribed Arnica 30C for muscular soreness post marathon training. Nux Vomica 30C added for hyperacidity.",
        lifestyleAdvice: "Avoid caffeine after 6 PM. Drink warm water post meals.",
        followUpDate: "Oct 15, 2026",
        homeopathicCaseRecord: {
          metadata: {
            interaction_id: "INT-VS-20260915-01",
            visiting_date: "2026-09-15",
            visiting_time: "10:30",
            speech_language: {
              original: "English",
              processed: "English",
            },
          },
          doctor_details: {
            doctor_id: "DOC-BK-001",
            name: CLINIC.DOCTOR_TITLE,
            clinic_name: CLINIC.FULL_NAME,
          },
          patient_details: {
            name: "John Doe",
            age: 34,
            gender: "Male",
            place_of_birth: null,
            is_existing_patient: true,
          },
          patient_medical_history: {
            past_illnesses: [
              { condition: "Chronic Dyspepsia", onset_year: 2024, status: "Sub-acute recurrent" },
            ],
            family_history: [
              { relation: "Father", condition: "Gastric ulcer disease" },
            ],
            drug_history: {
              allopathic_medications: [
                { drug_name: "Omeprazole", dosage: "20mg", frequency: "OD", purpose: "Acid reflux" },
              ],
              previous_homeopathic_remedies: [
                { remedy: "Nux Vomica", potency: "30C", outcome: "Partial relief of morning nausea" },
              ],
              drug_allergies: ["Penicillin"],
            },
          },
          homeopathic_case_analysis: {
            chief_complaints: [
              {
                location: "Epigastrium and bilateral hamstring muscles",
                sensation: "Burning fullness with sore, bruised sensation post physical training",
                modalities: {
                  aggravation: "Mental overwork, coffee consumption, motion and touch on hamstring",
                  amelioration: "Warm compresses, resting in darkened room, passing flatus",
                },
                concomitants: "Sour eructations, morning irritability, craving for stimulants",
              },
            ],
            generals_and_constitution: {
              thermal_state: "Chilly",
              thirst: "Moderate thirst for warm water",
              cravings_aversions: {
                cravings: ["Warm coffee", "Spicy food", "Fats"],
                aversions: ["Cold milk", "Uncooked raw vegetables"],
              },
              sleep_and_dreams: "Wakes at 3:00 AM with work preoccupation",
              mental_emotional_state: "High-drive executive, irritable when interrupted, fastidious",
            },
          },
          clinical_summary: {
            conversation_summary: "Patient presented with acute post-marathon muscular fatigue combined with recurrent acid dyspepsia aggravated by caffeine indiscretion.",
            miasmatic_predominance: "Psoro-Sycotic",
          },
          treatment_plan: {
            medicines_suggested: [
              {
                remedy_name: "Arnica Montana",
                potency: "30C",
                dosage_form: "Globules (Size 30 cane sugar pills)",
                frequency: "Twice daily",
                instructions: "4 globules twice daily after meals for 10 days.",
              },
              {
                remedy_name: "Nux Vomica",
                potency: "30C",
                dosage_form: "Liquid dilution in purified water",
                frequency: "Once at night",
                instructions: "4 drops in half teaspoon of water post dinner for 7 days.",
              },
            ],
            next_visit: {
              recommended_date: "2026-10-15",
              time_frame: "In 4 Weeks",
            },
          },
          patient_visibility_permissions: {
            share_remedies: true,
            share_modalities: true,
            share_lifestyle: true,
            share_mental_state: false,
            share_miasm: false,
            share_conversation_summary: false,
          },
        },
      },
      {
        id: "vis-100",
        visitDate: "Aug 02, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.MALLESHWARAM,
        chiefDiagnosis: "Initial Constitutional Evaluation & Allergic Sensitivity",
        symptomsObserved: ["Morning sneezing fits", "Skin itching on sun exposure"],
        prescribedRemedies: [
          { medicineId: "m4", medicineName: "Sulphur", potency: "200C", dosage: "Single dose on Sunday morning", duration: "4 weeks" },
          { medicineId: "m7", medicineName: "Calcarea Fluorica", potency: "6X", dosage: "4 tablets thrice daily", duration: "30 days" },
        ],
        clinicalNotes: "Detailed case taking performed. Hot patient profile with constitutional Sulphur affinity. Prescribed Calcarea Fluor 6X for joint support.",
        lifestyleAdvice: "Sunscreen application when outdoors. Hydration 3L daily.",
        followUpDate: "Sep 15, 2026",
      },
    ],
  },
  "usr-002": {
    patientId: "usr-002",
    patientName: "Priya Sharma",
    age: 29,
    gender: "Female",
    bloodGroup: "B+",
    knownAllergies: ["Pollen", "Dairy"],
    medicalHistory: ["Anxiety-induced Insomnia", "Sinusitis"],
    visits: [
      {
        id: "vis-201",
        visitDate: "Sep 20, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Anxiety-linked Abdominal Discomfort & Sun Headache",
        symptomsObserved: ["Flatulence late afternoon", "Throbbing frontal headache"],
        prescribedRemedies: [
          { medicineId: "m2", medicineName: "Lycopodium Clavatum", potency: "200C", dosage: "2 drops in water before bedtime", duration: "14 days" },
          { medicineId: "m6", medicineName: "Natrum Muriaticum", potency: "200C", dosage: "4 globules daily", duration: "14 days" },
        ],
        clinicalNotes: "Patient responds well to Lycopodium constitutional treatment. Added Natrum Mur 200C for sun-triggered headaches.",
        lifestyleAdvice: "Practice 10 mins Pranayama morning & evening.",
        followUpDate: "Oct 20, 2026",
      },
    ],
  },
};

