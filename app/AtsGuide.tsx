/**
 * ============================================================================
 *  SECTION PÉDAGOGIQUE — « C'est quoi un ATS ? »
 * ============================================================================
 *
 * Ce fichier ne contient QUE le texte affiché sous les résultats. Il est isolé
 * exprès pour que tu puisses le modifier sans toucher au reste de l'app.
 *
 * Pour éditer : change simplement le texte entre les balises. La structure est
 * volontairement simple :
 *   <h2>  = titre de section
 *   <p>   = paragraphe
 *   <ul><li> = liste à puces   (<strong> pour mettre un début de puce en gras)
 *
 * La mise en forme (largeur limitée, interligne aéré, styles des titres et
 * puces) est gérée par la classe `.guide` dans app/globals.css.
 * ----------------------------------------------------------------------------
 */

export default function AtsGuide() {
  return (
    <section className="guide">
      <h2>C&apos;est quoi un ATS ?</h2>
      <p>
        Un ATS (Applicant Tracking System) est un logiciel que les entreprises
        utilisent pour recevoir, trier et classer les candidatures. Quand tu
        postules en ligne, ton CV passe souvent par lui avant qu&apos;un humain
        ne le voie. Il lit le texte de ton CV, le compare à l&apos;annonce, et
        classe les candidats.
      </p>
      <p>
        Le point important : l&apos;ATS ne te refuse presque jamais tout seul —
        il y a toujours un recruteur derrière. Mais un CV mal formaté ou pauvre
        en mots-clés peut se retrouver classé si bas qu&apos;il n&apos;est jamais
        consulté. Le but n&apos;est donc pas de « tromper » le logiciel, mais de
        s&apos;assurer que ton vrai profil est bien lu et bien classé.
      </p>

      <h2>Qu&apos;est-ce qu&apos;un CV optimisé ATS ?</h2>
      <ul>
        <li>
          <strong>Du vrai texte sélectionnable</strong>, jamais une image ni un
          scan. Test rapide : si tu peux surligner et copier le texte de ton CV,
          c&apos;est bon signe.
        </li>
        <li>
          <strong>Une structure simple</strong> avec des titres de sections
          standards : Expérience, Compétences, Formation.
        </li>
        <li>
          <strong>
            Pas de tableaux, colonnes multiples, zones de texte ni en-têtes
            compliqués
          </strong>{" "}
          : ça brouille la lecture de l&apos;ATS.
        </li>
        <li>
          <strong>Les mots-clés de l&apos;annonce</strong> (compétences, outils,
          intitulés de poste) présents quand tu les possèdes vraiment, formulés
          avec les mêmes termes que l&apos;annonce.
        </li>
        <li>
          <strong>Ton nom et tes coordonnées</strong> clairement lisibles.
        </li>
      </ul>

      <h2>Sur quoi cet outil intervient</h2>
      <p>
        Il prend ton CV réel et l&apos;annonce visée, puis réécrit ton CV pour
        respecter ces règles : structure lisible, mots-clés exacts quand tu as
        la compétence, expériences pertinentes mises en avant — sans jamais rien
        inventer.
      </p>
    </section>
  );
}
