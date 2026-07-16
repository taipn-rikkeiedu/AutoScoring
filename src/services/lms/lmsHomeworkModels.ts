import { LmsSession, LmsHomework, ExerciseTemplate } from '../../types';
import { extractCriteriaFromAssignment, DEFAULT_CRITERIA } from '../../core/utils';

export class LmsHomeworkModel {
  id: number;
  title: string;
  rawDescription: string;
  cleanDescription: string;
  assignmentText: string;
  criteria: string;

  constructor(data: LmsHomework) {
    this.id = data.id;
    this.title = data.title ? data.title.trim() : '';
    this.rawDescription = data.description || '';
    this.cleanDescription = LmsHomeworkModel.stripHtml(this.rawDescription);

    const { assignment, criteria } = extractCriteriaFromAssignment(this.cleanDescription);
    this.assignmentText = assignment;
    this.criteria = criteria || DEFAULT_CRITERIA;
  }

  static stripHtml(html: string): string {
    if (!html) return '';
    let text = html;

    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<tr>/gi, '\n');
    text = text.replace(/<\/td>/gi, ' | ');
    text = text.replace(/<\/tr>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');

    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    return text.replace(/\n\s*\n+/g, '\n\n').trim();
  }

  toExerciseTemplate(chapterName: string, sessionName: string): ExerciseTemplate {
    return {
      chapter: chapterName,
      session: sessionName,
      assignment_name: this.title,
      assignment_text: this.assignmentText,
      criteria: this.criteria
    };
  }
}

export class LmsSessionModel {
  id: number;
  name: string;
  type: string;
  homeworks: LmsHomeworkModel[];

  constructor(data: LmsSession) {
    this.id = data.id;
    this.name = data.name ? data.name.trim() : '';
    this.type = data.type || '';
    this.homeworks = Array.isArray(data.homework)
      ? data.homework.map(h => new LmsHomeworkModel(h))
      : [];
  }

  toExerciseTemplates(chapterName: string): ExerciseTemplate[] {
    return this.homeworks.map(h => h.toExerciseTemplate(chapterName, this.name));
  }
}
