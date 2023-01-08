import { RequestOptions } from 'https';
import { HTMLElement } from 'node-html-parser';
import { URL } from 'url';

import { Message } from '../../../model/telegram/message';
import { Publisher } from '../../../model/validator/publisher';
import { Validation } from '../../../model/validator/validation';
import { HtmlUtil } from '../../../util/html-util';
import { AbstractValidator } from '../abstract-validator';

export class PublisherValidatorService extends AbstractValidator<Publisher> {
  private static readonly PUBLISHERS: string =
    'https://graph.org/DMCA-Publishers-List-09-21-3';
  private static readonly BEGIN_LIST: string = '𝙼𝚎𝚖𝚋𝚎𝚛𝚜 𝚙𝚕𝚎𝚊𝚜𝚎 𝚝𝚊𝚔𝚎 𝚗𝚘𝚝𝚎';
  private static readonly LIST_ELEMENT_START: string = '▫︎ ';
  private static readonly IMPRINT: string = '- Imprint';
  private static readonly MASK_PARAM: string = 'Publisher';

  constructor() {
    super();
  }

  protected validateMessage(message: Message): Validation {
    let result: Validation = Validation.valid();

    const publisher: string | null = message.getPublisher();
    if (publisher != null) {
      const academicPublisher: Publisher | undefined = this.elements.find(
        (p: Publisher) => publisher.toLowerCase().startsWith(p.name)
      );
      if (academicPublisher != undefined) {
        result = Validation.invalid(
          this.getError(publisher, academicPublisher.imprint)
        );
      }
    }

    return result;
  }

  private getError(publisher: string, imprint: string | null): string {
    let error: string =
      'The publisher of your #request, ' +
      this.mask(publisher, PublisherValidatorService.MASK_PARAM);

    if (imprint != null) {
      error +=
        ' (imprint ' +
        this.mask(imprint, PublisherValidatorService.MASK_PARAM) +
        ')';
    }

    error += ", is academic and can't be displayed here.";

    return error;
  }

  protected getElementsLink(): string | RequestOptions | URL {
    return PublisherValidatorService.PUBLISHERS;
  }

  protected parseElements(html: HTMLElement): Publisher[] {
    const elements: Publisher[] = [];
    const htmlElements: HTMLElement[] = html.querySelectorAll('p');

    let isList = false;
    for (const htmlElement of htmlElements) {
      const content: string = HtmlUtil.getTextContent(htmlElement).trim();

      if (
        isList &&
        content.startsWith(PublisherValidatorService.LIST_ELEMENT_START)
      ) {
        elements.push(this.getPublisher(content));
      }

      // the following elements are in the list
      isList = this.isListBegin(
        isList,
        content,
        PublisherValidatorService.BEGIN_LIST
      );
    }

    return elements;
  }

  private getPublisher(content: string): Publisher {
    // remove list element and other special chars
    const sanitizedString: string = content
      .substring(PublisherValidatorService.LIST_ELEMENT_START.length)
      .replace('\\U0026', '&');

    const hashTagIndex: number = sanitizedString.indexOf('#');

    // remove hashtag
    let publisherName: string = sanitizedString;
    if (hashTagIndex > -1) {
      publisherName = sanitizedString.substring(0, hashTagIndex);
    }

    let imprint: string | null = null;

    // split imprint and publisher
    const publisherParts: string[] = publisherName.split(
      PublisherValidatorService.IMPRINT
    );
    // publisher
    publisherName = publisherParts[0].trim();
    // imprint
    if (publisherParts.length > 1) {
      imprint = publisherParts[1].trim();
    }

    return { name: publisherName.toLowerCase(), imprint: imprint };
  }
}
